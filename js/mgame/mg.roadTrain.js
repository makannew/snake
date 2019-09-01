import { roadTrainControls } from "./mg.roadTrain.controls.js";
import { loadBuilder } from "./mg.roadTrain.builder.js";
import { roadTrainTowing } from "./mg.roadTrain.towing.js";

export function newRoadTrain(mainComposite , roadTrain){
  mainComposite.addLink(mainComposite.cannon , roadTrain.cannon);
  mainComposite.addLink(mainComposite.actualInterval , roadTrain.actualInterval);

  roadTrainControls(roadTrain);
  roadTrainTowing(roadTrain);
  loadBuilder(mainComposite,roadTrain);

  roadTrain.allWheels = [];
  roadTrain.suspensionRestLenght = 0;
  roadTrain.speed = 0;
  roadTrain.engineForce =30;
  roadTrain.addFunction(setHingeConstraints);
  //roadTrain.addFunction(updateSpring);
  roadTrain.addFunction(applySteering);
  roadTrain.addFunction(updateEngine);

}

function updateEngine({setHingeConstraints , engineForce , speed}){
  for (let wheel of allWheels){
    if (wheel.driving){
      let c = wheel.wheelConstraint;
      if (engineForce==0){
        c.disableMotor()
      }else{
        c.setMotorMaxForce(engineForce);
        if (wheel.isLeft){
          c.setMotorSpeed(speed);
        }else{
          c.setMotorSpeed(-speed);
        }
        c.enableMotor();
      }
    }

  }
}

function applySteering({steering , setHingeConstraints}){
  let x = Math.cos(steering);
  let z = Math.sin(steering);
  for (let wheel of allWheels){
    if (wheel.steering){
      if (wheel.isLeft){
        wheel.wheelConstraint.axisA.x = x;
        wheel.wheelConstraint.axisA.z = z;
      }else{
        wheel.wheelConstraint.axisA.x = -x;
        wheel.wheelConstraint.axisA.z = -z;
      }
      wheel.wheelConstraint.update();
    }
  }
}

function setHingeConstraints({headBodiesLoaded , cannon}){
  if (setHingeConstraints) return true;
  let zero = new CANNON.Vec3(0,0,0);
  let axisA,axisB;
  let axelSprings=[];

  for (let i=0,len=wheelsBodies.length;i<len;++i){
    let thisWheel={};

    let wheelRelativePos = new CANNON.Vec3(wheelsBodies[i].position.x - suspensionsBodies[i].position.x, 
      wheelsBodies[i].position.y - suspensionsBodies[i].position.y, 
      wheelsBodies[i].position.z - suspensionsBodies[i].position.z);

    if (wheels[i].wheelLeft){
      thisWheel.isLeft = true;
      axisA = new CANNON.Vec3(1,0,0);
      axisB = new CANNON.Vec3(0,1,0);
    }

    if (!wheels[i].wheelLeft){
      thisWheel.isLeft = false;
      axisA = new CANNON.Vec3(-1,0,0);
      axisB = new CANNON.Vec3(0,1,0);
    }

    thisWheel.wheelConstraint = new CANNON.HingeConstraint(suspensionsBodies[i],wheelsBodies[i],{
      pivotA: wheelRelativePos,
      axisA:axisA,
      pivotB: zero,
      axisB: axisB,
      maxForce:1e6,
      collideConnected:false
    });
    thisWheel.wheelConstraint.collideConnected = false;
    cannon.addConstraint(thisWheel.wheelConstraint);

    if (wheels[i].wheelSteering){
      thisWheel.steering =true;
    }else{
      thisWheel.steering =false;

    }

    if (wheels[i].driving){
      thisWheel.driving = true;
    }else{
      thisWheel.driving = false;
    }


    let farPivotChassis = new CANNON.Vec3(-(suspensionsBodies[i].position.x - chassisBody.position.x + wheelRelativePos.x), 
      suspensionsBodies[i].position.y - chassisBody.position.y + wheelRelativePos.y, 
      suspensionsBodies[i].position.z - chassisBody.position.z + wheelRelativePos.z);
    let farPivotSuspension = new CANNON.Vec3(chassisBody.position.x + farPivotChassis.x - suspensionsBodies[i].position.x, 
      wheelRelativePos.y, 
      wheelRelativePos.z);
    // suspension constraint
    thisWheel.suspensionConstraint = new CANNON.HingeConstraint(chassisBody, suspensionsBodies[i],{
      pivotA: farPivotChassis,
      axisA: new CANNON.Vec3(0,0,1),
      pivotB: farPivotSuspension,
      axisB: new CANNON.Vec3(0,0,1),
      maxForce:1e6
    });
    cannon.addConstraint(thisWheel.suspensionConstraint);

    let suspensionRelativePos = new CANNON.Vec3(wheelsBodies[i].position.x - chassisBody.position.x, 
      wheelsBodies[i].position.y - chassisBody.position.y - wheels[i].springLenght, 
      wheelsBodies[i].position.z - chassisBody.position.z);

    // thisWheel.spring = new CANNON.Spring(chassisBody,suspensionsBodies[i],{
    //   restLength:suspensionRestLenght,
    //   stiffness: wheels[i].stiffness,
    //   damping: wheels[i].damping,
    //   localAnchorA:suspensionRelativePos,
    //   localAnchorB:wheelRelativePos
    // });
    axelSprings.push(new CANNON.Spring(chassisBody,suspensionsBodies[i],{
      restLength:suspensionRestLenght,
      stiffness: wheels[i].stiffness,
      damping: wheels[i].damping,
      localAnchorA:suspensionRelativePos,
      localAnchorB:wheelRelativePos
    }));



    allWheels.push(thisWheel);
  }
  cannon.addEventListener("postStep",function(event){
    for (let i=0,len=axelSprings.length;i<len;++i){
      axelSprings[i].applyForce();
      //let quat = new CANNON.Quaternion(suspensionsBodies[i].quaternion.x,suspensionsBodies[i].quaternion.y,suspensionsBodies[i].quaternion.z)

      // let wheelFixRotation = new CANNON.Quaternion();
      // wheelFixRotation.setFromAxisAngle(new CANNON.Vec3(0,0,1),Math.PI/2);
      // quat.mult(wheelFixRotation,quat);
      // let correctionQuat = new CANNON.Quaternion();
      // let rot;
      // if (!wheels[i].wheelLeft){
      //   rot =-Math.PI/2;
      // }else{
      //   rot = Math.PI/2;
      // }
      // correctionQuat.setFromAxisAngle(new CANNON.Vec3(0,0,1), rot);
      // quat.mult(correctionQuat,quat);
      // wheelsBodies[i].quaternion.copy(quat);

      //let susRotation = quat.toAxisAngle();


      //wheelsBodies[i].quaternion.setFromAxisAngle(susRotation[0],susRotation[1]);

      // quat.mult(wheelFixRotation,quat);
      // wheelsBodies[i].quaternion.copy(quat);
      // wheelsBodies[i].quaternion.y = quat.y;
      // wheelsBodies[i].quaternion.z = quat.z;

    }
  });


  return true;
}


